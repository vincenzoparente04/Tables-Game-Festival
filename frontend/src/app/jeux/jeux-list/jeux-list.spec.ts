import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JeuxList } from './jeux-list';

describe('JeuxList', () => {
  let component: JeuxList;
  let fixture: ComponentFixture<JeuxList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JeuxList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(JeuxList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
