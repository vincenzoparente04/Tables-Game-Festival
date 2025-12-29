import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JeuxForm } from './jeux-form';

describe('JeuxForm', () => {
  let component: JeuxForm;
  let fixture: ComponentFixture<JeuxForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JeuxForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(JeuxForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
