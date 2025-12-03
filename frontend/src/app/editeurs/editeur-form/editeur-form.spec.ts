import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditeurForm } from './editeur-form';

describe('EditeurForm', () => {
  let component: EditeurForm;
  let fixture: ComponentFixture<EditeurForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditeurForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditeurForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
